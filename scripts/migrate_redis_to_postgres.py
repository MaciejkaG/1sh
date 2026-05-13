import redis
import psycopg2
from datetime import datetime, timezone

REDIS_URL = "redis://default:hdDL06aepjmi6U7sJRcjjFPDYZWzJql4@redis-12335.c135.eu-central-1-1.ec2.cloud.redislabs.com:12335"
POSTGRES_URL = "postgresql://postgres:postgres@localhost:5432/onesh"

def migrate():
    r = redis.from_url(REDIS_URL)
    pg = psycopg2.connect(POSTGRES_URL)
    cur = pg.cursor()

    keys = r.keys("link:*")
    print(f"Found {len(keys)} keys in Redis")

    migrated = 0
    skipped = 0
    errors = 0

    for key in keys:
        key_str = key.decode() if isinstance(key, bytes) else key
        short_id = key_str[len("link:"):]

        url = r.get(key)
        if url is None:
            skipped += 1
            continue
        url_str = url.decode() if isinstance(url, bytes) else url

        try:
            cur.execute(
                """
                INSERT INTO link (id, url, custom, disabled, "createdAt")
                VALUES (%s, %s, false, false, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (short_id, url_str, datetime.now(timezone.utc)),
            )
            migrated += cur.rowcount
            if cur.rowcount == 0:
                skipped += 1
        except Exception as e:
            print(f"Error on {key_str}: {e}")
            errors += 1

    pg.commit()
    cur.close()
    pg.close()

    print(f"Done. migrated={migrated}, skipped(conflict)={skipped}, errors={errors}")

if __name__ == "__main__":
    migrate()
