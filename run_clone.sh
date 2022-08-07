echo $SUBREPO_KEY | tr " " "\n" > /app/id_rsa_refactor

cat /app/id_rsa_refactor

ls -a /

echo $(cat key_info.txt) > /app/ssh_config

GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=no -i /app/ssh_config -o IdentitiesOnly=yes' git clone git@github.com:andrew-healey/shift-refactor.git