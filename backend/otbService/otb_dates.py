"""Date helpers shared by the FIDE and US Chess modules."""

# Length of a "YYYY-MM" prefix of an ISO date ("2026-09-27" -> "2026-09").
YEAR_MONTH_LEN = len("YYYY-MM")


def to_year_month(date):
    """'2026-09-27' -> '2026-09'. None/empty -> ''."""
    return (date or "")[:YEAR_MONTH_LEN]
