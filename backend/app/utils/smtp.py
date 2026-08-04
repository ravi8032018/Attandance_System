# backend/app/_hooks/auth_helpers.py
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
SUBJECT1 = os.getenv("SUBJECT1")
BODY1 = os.getenv("BODY1")
UNIQUE_ID = os.getenv("UNIQUE_ID")
# print(BODY)

# TO_EMAIL = os.getenv("TO_EMAIL")

# print(SMTP_SERVER)
# print(SMTP_PORT)
# print(USER)
# print(PASSWORD)
# print(TO_EMAIL)

def send_email_with_link(emails_file: str, subject: str= SUBJECT1, Body: str= BODY1, OTP: str= None):
    with open(emails_file, "r+") as f:
        emails = json.load(f)
        # print(emails)
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            # print("\n \t Batch Processing---> ")
            now1 = time.time()
            smtp.ehlo()
            # print("EHLO time: ", time.time() - now1)

            now2 = time.time()
            smtp.starttls()
            # print("StartTLS time: ", time.time() - now2)

            now3 = time.time()
            smtp.ehlo()
            # print("Second EHLO time: ", time.time() - now3)

            now4 = time.time()
            smtp.login(USER, PASSWORD)
            # print("Login time: ", time.time() - now4)

            for email in emails:
                if email["is_sent"] is True:
                    # print(f"Skipping email: {email['email_to']}")
                    continue
                # print("Email : ",email)
                if OTP is None:
                    unique_part= "registration_no" if "registration_no" in email else 'faculty_id'
                    body = UNIQUE_ID + email[unique_part] + "\n" + str(Body) + "\n" + email["link"]
                else:
                    body= Body + "\n\n\n\t\t\t" + OTP
                msg = EmailMessage()
                msg['Subject'] = subject
                msg['From'] = USER
                msg['To'] = email["email_to"]
                msg.set_content(body)

                now5 = time.time()
                smtp.sendmail(USER, email["email_to"], msg.as_string())
                # print("Sendmail time: ", time.time() - now5, "\t", email["email_to"])

                # print(email['email_to'])
                email['is_sent'] = True  # Update the value you want

        # Go back to the beginning of the file before writing
        f.seek(0)
        json.dump(emails, f, indent=2)
        f.truncate()  # Remove any leftover data

        # print("Final time: ", time.time() - now1)

    # print("Email sent successfully to {}".format(to_email))


def send_single_email(to_email: str, subject: str, body: str, html_body: str = None) -> bool:
    """
    Direct single email dispatcher using existing system SMTP credentials.
    """
    if not to_email or "@" not in to_email:
        print(f"[SMTP] Invalid recipient email: '{to_email}'")
        return False

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = USER or "noreply@aus.ac.in"
        msg['To'] = to_email
        msg.set_content(body)
        if html_body:
            msg.add_alternative(html_body, subtype='html')

        port = int(SMTP_PORT or 587)
        if SMTP_SERVER:
            with smtplib.SMTP(SMTP_SERVER, port) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                if USER and PASSWORD:
                    smtp.login(USER, PASSWORD)
                smtp.sendmail(USER or "noreply@aus.ac.in", to_email, msg.as_string())
            print(f"[SMTP] Email successfully dispatched to {to_email}")
            return True
        else:
            print(f"[SMTP Console Fallback] To: {to_email} | Subject: {subject}\nBody:\n{body}")
            return True
    except Exception as e:
        print(f"[SMTP Exception] Failed to send email to {to_email}: {e}")
        # Always output to console fallback so development/testing continues seamlessly
        print(f"[SMTP Fallback Log] To: {to_email} | Subject: {subject}\nBody:\n{body}")
        return False

