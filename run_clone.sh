echo $SUBREPO_KEY > /app/id_rsa_refactor

ls -a /

echo $(cat key_info.txt) > /app/ssh_config
ssh-add /app/ssh_config

git clone git@github.com-refactor:andrew-healey/shift-refactor.git