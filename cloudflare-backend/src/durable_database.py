"""SQLAlchemy DB-API adapter for a Durable Object's synchronous SQLite storage."""
import functools
import inspect
import sqlite3
from contextvars import ContextVar

_storage = ContextVar("durable_storage")


def bind_storage(storage):
    return _storage.set(storage)


def reset_storage(token):
    _storage.reset(token)


def current_storage():
    return _storage.get()


def _python_value(value):
    if hasattr(value, "to_py"):
        value = value.to_py()
    if isinstance(value, memoryview):
        return bytes(value)
    return value


class Cursor:
    arraysize = 1

    def __init__(self, connection):
        self.connection = connection
        self.description = None
        self.rowcount = -1
        self.lastrowid = None
        self._rows = []
        self._offset = 0

    def execute(self, statement, parameters=()):
        bindings = []
        for parameter in parameters:
            if isinstance(parameter, (bytes, bytearray, memoryview)):
                from pyodide.ffi import to_js
                parameter = to_js(memoryview(parameter))
            bindings.append(parameter)
        try:
            result = self.connection.storage.sql.exec(statement, *bindings)
            names = list(_python_value(result.columnNames))
            self.description = [(name, None, None, None, None, None, None) for name in names] or None
            self._rows = []
            iterator = result.raw()
            while True:
                item = iterator.next()
                if item.done:
                    break
                row = _python_value(item.value)
                self._rows.append(tuple(_python_value(value) for value in row))
            self._offset = 0
            self.rowcount = -1
            if not names and statement.lstrip()[:6].upper() in ("INSERT", "UPDATE", "DELETE"):
                # rowsWritten also counts index writes; SQLAlchemy needs matched rows.
                changes = self.connection.storage.sql.exec("SELECT changes()").raw().next()
                self.rowcount = int(_python_value(changes.value)[0])
            self.lastrowid = None
            return self
        except Exception as exc:
            error_type = sqlite3.IntegrityError if "constraint" in str(exc).lower() else sqlite3.DatabaseError
            raise error_type(str(exc)) from exc

    def executemany(self, statement, parameter_sets):
        count = 0
        for parameters in parameter_sets:
            self.execute(statement, parameters)
            count += max(self.rowcount, 0)
        self.rowcount = count
        return self

    def fetchone(self):
        if self._offset >= len(self._rows):
            return None
        row = self._rows[self._offset]
        self._offset += 1
        return row

    def fetchmany(self, size=None):
        size = self.arraysize if size is None else size
        rows = self._rows[self._offset:self._offset + size]
        self._offset += len(rows)
        return rows

    def fetchall(self):
        rows = self._rows[self._offset:]
        self._offset = len(self._rows)
        return rows

    def close(self):
        self._rows = []


class Connection:
    isolation_level = None

    def __init__(self):
        self.storage = current_storage()

    def cursor(self):
        return Cursor(self)

    def execute(self, statement, parameters=()):
        return self.cursor().execute(statement, parameters)

    def create_function(self, *args, **kwargs):
        # The dialect's regexp/floor helpers are not used by this API.
        pass

    def commit(self):
        # transactionSync owns the encompassing transaction.
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def atomic_endpoint(endpoint):
    @functools.wraps(endpoint)
    async def invoke(*args, **kwargs):
        values, errors = [], []

        def run():
            try:
                values.append(endpoint(*args, **kwargs))
            except BaseException as exc:
                errors.append(exc)
                raise

        try:
            current_storage().transactionSync(run)
        except BaseException:
            if errors:
                raise errors[0]
            raise
        return values[0]
    return invoke


def route_class():
    from fastapi.routing import APIRoute

    class DurableRoute(APIRoute):
        def __init__(self, *args, **kwargs):
            endpoint = kwargs.get("endpoint")
            if endpoint is not None and not inspect.iscoroutinefunction(endpoint):
                kwargs["endpoint"] = atomic_endpoint(endpoint)
            super().__init__(*args, **kwargs)
    return DurableRoute
