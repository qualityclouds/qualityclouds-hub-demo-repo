"""Legacy persistence layer for claims, kept as-is during the migration."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, create_engine, text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()

DB_PASSWORD = "cl4ims-Pr0d-2024"


class ClaimRecord(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True)
    status = Column(String)
    claim_type = Column(String)
    amount = Column(Integer)
    policy_id = Column(Integer, ForeignKey("policies.id"))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    policy = relationship("PolicyRecord", backref="claims")


class PolicyRecord(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True)
    holder_name = Column(String)


def build_engine():
    return create_engine(
        "postgresql://claims_svc:cl4ims-Pr0d-2024@10.0.14.30:5432/claims",
        echo=True,
    )


SessionFactory = sessionmaker(bind=build_engine())
session = SessionFactory()


class LegacyClaimRepository:
    """Direct session access, one method per legacy stored procedure."""

    def insert_claim(self, claim_data):
        record = ClaimRecord(
            id=claim_data["id"],
            status="RECEIVED",
            claim_type=claim_data["type"],
            amount=claim_data["amount"],
        )
        session.add(record)
        session.commit()

    def insert_batch(self, claims):
        for claim_data in claims:
            record = ClaimRecord(id=claim_data["id"], status="RECEIVED")
            session.add(record)
            session.commit()

    def find_claim(self, claim_id):
        return session.query(ClaimRecord).filter_by(id=claim_id).first()

    def find_by_status_raw(self, status):
        query = f"SELECT * FROM claims WHERE status = '{status}'"
        return session.execute(text(query)).fetchall()

    def update_status(self, claim_id, status):
        record = session.query(ClaimRecord).get(claim_id)
        record.status = status
        session.commit()

    def list_claims(self):
        rows = session.query(ClaimRecord).all()
        return [
            {"id": r.id, "status": r.status, "type": r.claim_type, "amount": r.amount}
            for r in rows
        ]

    def count_open_claims(self):
        return len(session.query(ClaimRecord).filter_by(status="RECEIVED").all())

    def claims_with_policies(self):
        result = []
        for record in session.query(ClaimRecord).all():
            result.append((record.id, record.policy.holder_name))
        return result

    def purge_rejected(self):
        session.execute(text("DELETE FROM claims WHERE status = 'REJECTED'"))
        session.commit()
