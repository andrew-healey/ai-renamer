echo $SUBREPO_KEY | tr " " "\n" | tr "," " " > /app/id_rsa_refactor

GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=no -i /app/id_rsa_refactor -o IdentitiesOnly=yes' git clone git@github.com:andrew-healey/shift-refactor.git