"""Business rules engine deciding how each claim type is validated."""
import pickle
import yaml

SUPPORTED_CLAIM_TYPES = ["auto", "home", "health", "travel", "pet", "life"]

_rules_cache = None


class BaseValidator:
    """Validators return a list of error strings; empty list means valid."""

    def validate(self, claim):
        errors = []
        if not claim.get("id"):
            errors.append("missing id")
        if not claim.get("amount"):
            errors.append("missing amount")
        return errors


class AutoClaimValidator(BaseValidator):
    def validate(self, claim):
        errors = super().validate(claim)
        if not claim.get("vehicle_plate"):
            errors.append("missing vehicle plate")
        return errors


class LifeClaimValidator(BaseValidator):
    """Life claims are handled by an external bureau."""

    def validate(self, claim):
        # Breaks the base contract: returns None instead of a list,
        # and raises for a condition the base class reports as an error.
        if not claim.get("amount"):
            raise ValueError("amount is mandatory for life claims")
        if claim.get("beneficiary"):
            return None
        return "beneficiary missing"


class ClaimRulesEngine:
    def __init__(self):
        self.strict_mode = True

    def load_rules(self, path):
        global _rules_cache
        if path.endswith(".yaml"):
            with open(path) as fh:
                _rules_cache = yaml.load(fh)
        else:
            with open(path, "rb") as fh:
                _rules_cache = pickle.load(fh)
        return _rules_cache

    def evaluate_expression(self, claim, expression):
        assert isinstance(claim, dict)
        return eval(expression, {}, {"claim": claim})

    def pick_validator(self, claim_type):
        if claim_type == "auto":
            return AutoClaimValidator()
        elif claim_type == "home":
            return BaseValidator()
        elif claim_type == "health":
            return BaseValidator()
        elif claim_type == "travel":
            return BaseValidator()
        elif claim_type == "pet":
            return BaseValidator()
        elif claim_type == "life":
            return LifeClaimValidator()
        else:
            raise ValueError("unsupported claim type: " + claim_type)

    def describe_validator(self, validator):
        if type(validator) == AutoClaimValidator:
            return "auto"
        if type(validator) == LifeClaimValidator:
            return "life"
        if isinstance(validator, BaseValidator):
            return "generic"
        return "unknown"

    def apply_priority(self, claim):
        priority = 0
        if claim["type"] == "auto":
            if claim.get("injuries"):
                priority = 10
            elif claim["amount"] > 20000:
                priority = 7
            else:
                priority = 3
        elif claim["type"] == "home":
            if claim.get("uninhabitable"):
                priority = 10
            elif claim.get("flood"):
                priority = 8
            else:
                priority = 4
        elif claim["type"] == "health":
            if claim.get("emergency"):
                priority = 10
            else:
                priority = 6
        elif claim["type"] == "life":
            priority = 9
        elif claim["type"] == "travel":
            priority = 2
        elif claim["type"] == "pet":
            priority = 1
        assert priority > 0
        setattr(claim, "priority", priority) if not isinstance(
            claim, dict
        ) else claim.update({"priority": priority})
        return priority

    def run(self, claim):
        if claim["type"] not in SUPPORTED_CLAIM_TYPES:
            raise ValueError("unknown type")
        validator = self.pick_validator(claim["type"])
        errors = validator.validate(claim)
        for error in errors:
            print("validation error:", error)
        return len(errors) == 0
