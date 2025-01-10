import mysql.connector
from mysql.connector import Error
import hashlib
import os
import binascii


def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='violation_db',
            user='root',
            password='1234'
        )
        return connection
    except Error as e:
        print(f"資料庫連接錯誤: {e}")
        return None


def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000
    )
    return binascii.hexlify(pw_hash).decode('utf-8'), binascii.hexlify(salt).decode('utf-8')
