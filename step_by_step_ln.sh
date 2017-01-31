# Step by step update of app


# load COPY file from spreadsheet
fab text.update

# Get csv data books and parse it
fab data.load_books

# Render static app on www folder
fab render