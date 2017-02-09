#! /bin/bash

# Script path. 
SCRIPT=$(readlink -f $0)
SCRIPTPATH=`dirname $SCRIPT`

cd $SCRIPTPATH

source $SCRIPTPATH/.venv/bin/activate

fab data.update
fab render

