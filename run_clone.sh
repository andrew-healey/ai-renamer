echo $SUBREPO_KEY > /app/id_rsa_refactor

ls -a /

echo $(cat key_info.txt) > /app/ssh_config
ssh-add /app/ssh_config

GIT_SSH_COMMAND='ssh -i /app/ssh_config -o IdentitiesOnly=yes' git clone git@github.com:andrew-healey/shift-refactor.git