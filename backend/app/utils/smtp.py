# backend/app/utils/auth_helpers.py
import os, json
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import time

load_dotenv(dotenv_path= "../../.env")

SMTP_SERVER = os.getenv("SMTP_SERVER")  # Replace with your SMTP server
SMTP_PORT = os.getenv("SMTP_PORT", 587)
USER = os.getenv("USER")
PASSWORD = os.getenv("PASSWORD")
SUBJECT = os.getenv("SUBJECT")
BODY = os.getenv("BODY")
UNIQUE_ID = os.getenv("UNIQUE_ID")
# print(BODY)

# TO_EMAIL = os.getenv("TO_EMAIL")

# print(SMTP_SERVER)
# print(SMTP_PORT)
# print(USER)
# print(PASSWORD)
# print(TO_EMAIL)

def send_email_with_link(emails_file: str):
    with open(emails_file, "r+") as f:
        emails = json.load(f)
        # print(emails)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            print("\n \t Batch Processing---> ")
            now1 = time.time()
            smtp.ehlo()
            print("EHLO time: ", time.time() - now1)

            now2 = time.time()
            smtp.starttls()
            print("StartTLS time: ", time.time() - now2)

            now3 = time.time()
            smtp.ehlo()
            print("Second EHLO time: ", time.time() - now3)

            now4 = time.time()
            smtp.login(USER, PASSWORD)
            print("Login time: ", time.time() - now4)

            for email in emails:
                if email["is_sent"] is True:
                    print(f"Skipping email: {email['email_to']}")
                    continue
                # print("Email : ",email)
                unique_part= "registration_no" if "registration_no" in email else 'faculty_id'
                body = UNIQUE_ID + email[unique_part] + "\n" + str(BODY) + "\n" + email["link"]

                msg = EmailMessage()
                msg['Subject'] = SUBJECT
                msg['From'] = USER
                msg['To'] = email["email_to"]
                msg.set_content(body)

                now5 = time.time()
                smtp.sendmail(USER, email["email_to"], msg.as_string())
                print("Sendmail time: ", time.time() - now5, "\t", email["email_to"])

                # print(email['email_to'])
                email['is_sent'] = True  # Update the value you want

        # Go back to the beginning of the file before writing
        f.seek(0)
        json.dump(emails, f, indent=2)
        f.truncate()  # Remove any leftover data

        print("Final time: ", time.time() - now1)

    # print("Email sent successfully to {}".format(to_email))
