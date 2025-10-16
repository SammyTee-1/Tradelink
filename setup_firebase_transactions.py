import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase Admin SDK (adjust path if needed)
cred = credentials.Certificate("tradelink-key.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': "https://tradelink-7d01b-default-rtdb.asia-southeast1.firebasedatabase.app"
})


# Example notifications structure to insert
notifications = {
    "69606869": {
        "-OY1XrukW1xvUTat8v4_": {
            "adminSent": True,
            "date": "2025-08-19T13:36:18.594Z",
            "important": True,
            "message": "\ud83d\udce2 Welcome to Trubit!\n\nGet ready to trade!\n\ud83d\udd52 Trading sessions are: 12:00 PM, 12:30 PM, and 1:00 PM\n\n\ud83c\udf81 Qualified for bonus trades?\nDon\u2019t forget to move your funds from Exchange to Trade for a smooth experience.\n\nLet\u2019s win together \u2014 happy trading!",
            "read": False,
            "timestamp": 1755610578594,
            "title": "Welcome to Trubit!"
        }
    },
    "98743822": {
        "-OXn0NRgMxx8BH_6Q37a": {
            "adminSent": True,
            "date": "2025-08-16T13:15:40.086Z",
            "important": True,
            "message": "Our website link has changed. The old address will stop working from 20th August 2025.\nPlease use the new link: https://trubit.page.gd to continue access.",
            "read": False,
            "timestamp": 1755350140086,
            "title": "\ud83d\udd14 Website Address Update"
        }
    }
    # Add more users/notifications as needed
}


# Write to Firebase
ref = db.reference("notifications")
ref.set(notifications)

print("Sample notifications structure created in Firebase.")