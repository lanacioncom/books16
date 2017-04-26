import os
import app_config
import logging
from logging.handlers import RotatingFileHandler

LOG_FORMAT = '%(levelname)s:%(name)s:%(funcName)s(L%(lineno)d):%(asctime)s: %(message)s'

def get_logger(name=__name__, log_file_name=app_config.LOG_FILE_NAME):
    folder_logs = 'logs'
    file_path = os.path.join(folder_logs, log_file_name)
    if not os.path.exists(folder_logs):
        os.makedirs(folder_logs)

    # logger = logging.getLogger(__name__)
    logger = logging.getLogger(name)
    logger.setLevel(app_config.LOG_LEVEL)

    # create a file handler
    handler = RotatingFileHandler(file_path, mode='a', maxBytes=2*1024*1024, backupCount=2, encoding=None, delay=0)
    handler.setLevel(app_config.LOG_LEVEL)

    # create a logging format
    formatter = logging.Formatter(LOG_FORMAT)
    handler.setFormatter(formatter)

    # add the handlers to the logger
    logger.addHandler(handler)

    return logger
