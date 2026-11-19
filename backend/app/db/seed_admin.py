"""管理员账号初始化：确保 admin 账号存在且使用统一默认密码。

新库启动时创建；老库启动时仅在该账号密码不匹配时重置，
不会改动其他用户数据。
"""
import logging

from app.core.database import SessionLocal
from app.core.security import get_password_hash, verify_password
from app.models.user import User

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@example.com"
ADMIN_DEFAULT_PASSWORD = "123456"


def seed_admin_user(db) -> None:
    """确保 admin 账号存在，并让默认密码生效。"""
    admin = db.query(User).filter(User.username == ADMIN_USERNAME).first()

    if admin is None:
        db.add(User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=get_password_hash(ADMIN_DEFAULT_PASSWORD),
            role="admin",
            is_email_verified=True,
        ))
        db.commit()
        logging.info("已创建管理员账号 %s", ADMIN_USERNAME)
        return

    if not verify_password(ADMIN_DEFAULT_PASSWORD, admin.password_hash):
        admin.password_hash = get_password_hash(ADMIN_DEFAULT_PASSWORD)
        db.commit()
        logging.info("管理员账号 %s 的密码已重置为默认密码", ADMIN_USERNAME)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    db = SessionLocal()
    try:
        seed_admin_user(db)
    finally:
        db.close()
