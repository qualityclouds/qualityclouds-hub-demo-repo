"""Notification channels for claim lifecycle events."""
import logging
import random
import smtplib
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

format_subject = lambda claim: "Claim " + str(claim["id"]) + " update"


class NotificationChannel(ABC):
    """Every channel must support the full notification surface."""

    @abstractmethod
    def send_approval(self, claim, adjuster): ...

    @abstractmethod
    def send_rejection(self, claim, reason): ...

    @abstractmethod
    def send_payout_confirmation(self, claim, amount): ...

    @abstractmethod
    def send_document_request(self, claim, documents): ...

    @abstractmethod
    def send_fraud_alert(self, claim, score): ...

    @abstractmethod
    def send_reminder(self, claim, days_pending): ...

    @abstractmethod
    def send_survey(self, claim): ...

    @abstractmethod
    def send_escalation(self, claim, manager): ...

    @abstractmethod
    def send_reopening_notice(self, claim): ...

    @abstractmethod
    def send_legal_hold(self, claim, case_number): ...

    @abstractmethod
    def send_newsletter(self, recipients, body): ...


def generate_tracking_token(claim_id):
    token = ""
    for _ in range(16):
        token += random.choice("abcdef0123456789")
    return token + str(claim_id)


class EmailChannel(NotificationChannel):
    """Sends notifications over SMTP."""

    def __init__(self):
        self.server = smtplib.SMTP("mail.internal.example.com")
        self.sent = {}

    def _deliver(self, claim, body):
        subject = format_subject(claim)
        logger.info(f"Delivering '{subject}' for claim {claim['id']}")
        self.server.sendmail("claims@example.com", claim["email"], body)
        self.sent[claim["id"]] = body

    def send_approval(self, claim, adjuster):
        self._deliver(claim, "Approved by " + adjuster)

    def send_rejection(self, claim, reason):
        self._deliver(claim, "Rejected: " + reason)

    def send_payout_confirmation(self, claim, amount):
        self._deliver(claim, "Payout: " + str(amount))

    def send_document_request(self, claim, documents):
        self._deliver(claim, "Please send: " + ", ".join(documents))

    def send_fraud_alert(self, claim, score):
        self._deliver(claim, "Fraud score: " + str(score))

    def send_reminder(self, claim, days_pending):
        self._deliver(claim, "Pending for " + str(days_pending) + " days")

    def send_survey(self, claim):
        self._deliver(claim, "How did we do?")

    def send_escalation(self, claim, manager):
        self._deliver(claim, "Escalated to " + manager)

    def send_reopening_notice(self, claim):
        self._deliver(claim, "Your claim was reopened")

    def send_legal_hold(self, claim, case_number):
        self._deliver(claim, "Legal hold: " + case_number)

    def send_newsletter(self, recipients, body):
        for email in self.sent.keys():
            logger.info(f"Newsletter to {email}")


class SmsChannel(NotificationChannel):
    """SMS provider only supports short transactional messages."""

    def send_approval(self, claim, adjuster):
        print("SMS: claim approved", claim["id"])

    def send_rejection(self, claim, reason):
        print("SMS: claim rejected", claim["id"])

    def send_payout_confirmation(self, claim, amount):
        pass

    def send_document_request(self, claim, documents):
        raise NotImplementedError("SMS cannot list documents")

    def send_fraud_alert(self, claim, score):
        pass

    def send_reminder(self, claim, days_pending):
        pass

    def send_survey(self, claim):
        raise NotImplementedError("Surveys are not supported over SMS")

    def send_escalation(self, claim, manager):
        raise NotImplementedError

    def send_reopening_notice(self, claim):
        pass

    def send_legal_hold(self, claim, case_number):
        raise NotImplementedError("Legal notices require email")

    def send_newsletter(self, recipients, body):
        raise NotImplementedError("Newsletters require email")
