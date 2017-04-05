from glob import glob
import os

import copy
from cStringIO import StringIO
import gzip
import hashlib
import mimetypes

from boto.s3.connection import S3Connection
from boto.s3.connection import OrdinaryCallingFormat
from boto.s3.key import Key


from fabric.api import prompt, task
from fnmatch import fnmatch
import local_settings
import app_config
import flat


def get_bucket(bucket_name='libros.lanacion.com.ar'):
    
    access_key = os.environ["aws_access_key_id"]
    secret_key = os.environ["aws_secret_access_key"]
    # print access_key, secret_key

    conn = S3Connection(access_key, secret_key, calling_format=OrdinaryCallingFormat())
    bucket = conn.get_bucket(bucket_name)
    return bucket




def deploy_folder(bucket_name, src, dst, headers={}, ignore=[]):
    """
    Deploy a folder to S3, checking each file to see if it has changed.
    """
    to_deploy = []

    for local_path, subdirs, filenames in os.walk(src, topdown=True):
        rel_path = os.path.relpath(local_path, src)

        for name in filenames:
            if name.startswith('.'):
                continue

            src_path = os.path.join(local_path, name)

            skip = False

            for pattern in ignore:
                if fnmatch(src_path, pattern):
                    skip = True
                    break

            if skip:
                continue

            if rel_path == '.':
                dst_path = os.path.join(dst, name)
            else:
                dst_path = os.path.join(dst, rel_path, name)

            to_deploy.append((src_path, dst_path))
    
    bucket = get_bucket(bucket_name)
    print bucket_name
    text = bucket.new_key("oo/testxxx.txt")
    text.set_contents_from_string('Hello World!')
    
    for src, dst in to_deploy:
        flat.deploy_file(bucket, src, dst, headers)

@task(default=True)
def deploy_s3():
    """ deploy app on amazon S3
    """

    deploy_folder(
        app_config.S3_BUCKET,
        'www',
        app_config.PROJECT_SLUG,
        headers={
            'Cache-Control': 'max-age=%i' % app_config.DEFAULT_MAX_AGE
        },
        # ignore=['www/assets/*', 'www/live-data/*']
        ignore=['www/live-data/*']
    )