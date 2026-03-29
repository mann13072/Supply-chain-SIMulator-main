import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, Integer, Float, LargeBinary
from sqlalchemy.orm import relationship
from database import Base


def _gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    networks = relationship("UserNetwork", back_populates="owner", cascade="all, delete-orphan")
    simulation_runs = relationship("SimulationRun", back_populates="owner", cascade="all, delete-orphan")


class UserNetwork(Base):
    __tablename__ = "user_networks"

    id = Column(String, primary_key=True, default=_gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, default="My Network")
    nodes = Column(JSON, default=list)
    routes = Column(JSON, default=list)
    params = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="networks")


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(String, primary_key=True, default=_gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    network_id = Column(String, ForeignKey("user_networks.id", ondelete="SET NULL"), nullable=True)

    name = Column(String, nullable=False, default="Untitled Run")
    description = Column(String, nullable=True)

    # Snapshot of network config at time of run (immutable record)
    nodes_snapshot = Column(JSON, nullable=False)
    routes_snapshot = Column(JSON, nullable=False)
    params_snapshot = Column(JSON, nullable=False)
    industry_config = Column(JSON, nullable=True)

    # Gzip-compressed JSON of HistorySnapshot[]
    history_data = Column(LargeBinary, nullable=False)

    # Denormalized summary KPIs (for listing without decompressing history)
    total_days = Column(Integer, nullable=False, default=0)
    total_revenue = Column(Float, nullable=True)
    total_cogs = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    total_operating_cost = Column(Float, nullable=True)
    avg_fill_rate = Column(Float, nullable=True)
    total_disruptions = Column(Integer, nullable=True)
    total_carbon_kg = Column(Float, nullable=True)

    tags = Column(JSON, default=list)
    is_shared = Column(Boolean, default=False)
    share_token = Column(String, nullable=True, unique=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="simulation_runs")
