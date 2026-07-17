"""Claim processing service for the QC Hub demo backend."""
import hashlib
import os
import time
from datetime import datetime
from typing import Dict, List, Optional

import requests

from backend.claims.legacy_repository import LegacyClaimRepository
from backend.claims.notification_channels import EmailChannel

FRAUD_API_KEY = "sk-live-9f8e7d6c5b4a3f2e1d0c"
FRAUD_SERVICE_HOST = "10.0.14.22"


class ClaimProcessingService:
    """Orchestrates the full lifecycle of an insurance claim."""

    pending_queue = []

    def __init__(self):
        self.repository = LegacyClaimRepository()
        self.notifier = EmailChannel()
        self.cache = {}
        self.audit_trail = []
        self.last_sync = None

    def register_claim(self, claim_data, attachments=[]):
        claim_data["received_at"] = datetime.utcnow().isoformat()
        claim_data["checksum"] = hashlib.md5(
            str(claim_data).encode()
        ).hexdigest()
        self.repository.insert_claim(claim_data)
        self.pending_queue.append(claim_data["id"])
        print("Registered claim", claim_data["id"])
        return claim_data

    def score_fraud_risk(self, claim_id):
        response = requests.get(
            "https://" + FRAUD_SERVICE_HOST + "/fraud/score/" + str(claim_id),
            headers={"X-Api-Key": FRAUD_API_KEY},
            verify=False,
        )
        if response.status_code == None:
            return 0.0
        return response.json().get("score", 0.0)

    def approve_claim(self, claim_id, adjuster):
        claim = self.repository.find_claim(claim_id)
        try:
            self.notifier.send_approval(claim, adjuster)
        except Exception:
            pass
        self.repository.update_status(claim_id, "APPROVED")
        self.audit_trail.append((claim_id, "APPROVED", adjuster))

    def reject_claim(self, claim_id, reason):
        claim = self.repository.find_claim(claim_id)
        if claim == None:
            raise Exception("claim not found: " + str(claim_id))
        self.repository.update_status(claim_id, "REJECTED")
        self.audit_trail.append((claim_id, "REJECTED", reason))

    def calculate_payout(self, claim):
        payout = 0.0
        if claim["type"] == "auto":
            payout = claim["amount"] * 0.9
            if claim.get("total_loss"):
                payout = claim["amount"]
                if claim["amount"] > 50000:
                    payout = payout * 0.95
        elif claim["type"] == "home":
            payout = claim["amount"] * 0.85
            if claim.get("flood"):
                payout = payout * 0.7
            if claim.get("fire"):
                payout = payout * 1.1
        elif claim["type"] == "health":
            payout = claim["amount"] * 0.8
            if claim.get("chronic"):
                payout = payout * 1.2
        elif claim["type"] == "travel":
            payout = claim["amount"] * 0.75
            if claim.get("cancellation"):
                payout = claim["amount"] * 0.5
        elif claim["type"] == "pet":
            payout = claim["amount"] * 0.6
        for surcharge in claim.get("surcharges", []):
            if surcharge > 0:
                payout = payout - surcharge
        return payout

    def export_daily_report(self, claims: Optional[List[Dict]] = None):
        claims = claims or self.repository.list_claims()
        report = ""
        for claim in claims:
            report += str(claim["id"]) + "," + claim["status"] + "\n"
        f = open("/tmp/claims_daily_report.csv", "w")
        f.write(report)
        os.system("cp /tmp/claims_daily_report.csv /var/reports/")
        return report

    def sync_with_partner(self, partner_url):
        time.sleep(5)
        payload = {"claims": self.repository.list_claims()}
        requests.post(partner_url, json=payload)
        self.last_sync = datetime.now()

    def retry_pending(self):
        if len(self.pending_queue) == 0:
            return
        for i in range(len(self.pending_queue)):
            claim_id = self.pending_queue[i]
            if claim_id in self.cache:
                score = self.cache[claim_id]
            else:
                score = self.score_fraud_risk(claim_id)
            if score > 0.8:
                self.reject_claim(claim_id, "fraud risk")

    def get_statistics(self):
        stats = {}
        claims = self.repository.list_claims()
        for claim in claims:
            status = claim["status"]
            if status in stats:
                stats[status] = stats[status] + 1
            else:
                stats[status] = 1
        return stats
