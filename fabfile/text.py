#!/usr/bin/env python

"""
Commands related to syncing copytext from Google Docs.
"""

import app_config
import os
import requests

from fabric.api import task
# from oauth import get_document, get_credentials
from termcolor import colored
# SPREADSHEET_URL_TEMPLATE = 'https://docs.google.com/feeds/download/spreadsheets/Export?exportFormat=xlsx&key=%s'
SPREADSHEET_URL_TEMPLATE = 'https://docs.google.com/spreadsheets/d/%s/pub?output=xlsx'


def get_document(key, file_path):
    """
    Uses Authomatic to get the google doc
    """
    url = SPREADSHEET_URL_TEMPLATE % key
    r = requests.get(url)

    if r.status_code != 200:
        if response.status == 404:
            raise KeyError("Error! Your Google Doc does not exist or you do not have permission to access it.")
        else:
            raise KeyError("Error! Google returned a %s error" % response.status)

    with open(file_path, 'wb') as writefile:
        writefile.write(r.content)
        

@task(default=True)
def update():
    """
    Downloads a Google Doc as an Excel file.
    """
    if app_config.COPY_GOOGLE_DOC_KEY == None:
        print colored('You have set COPY_GOOGLE_DOC_KEY to None. If you want to use a Google Sheet, set COPY_GOOGLE_DOC_KEY  to the key of your sheet in app_config.py', 'blue')
        return

    # credentials = get_credentials()
    # if not credentials:
    #     print colored('No Google OAuth credentials file found.', 'yellow')
    #     print colored('Run `fab app` and visit `http://localhost:8000` to generate credentials.', 'yellow')
    #     return

    get_document(app_config.COPY_GOOGLE_DOC_KEY, app_config.COPY_PATH)
