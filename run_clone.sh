echo $SUBREPO_KEY > /app/id_rsa_refactor

ls /

echo $(cat key_info.txt) > /etc/ssh/ssh_config

git clone git@github-refactor:andrew-healey/shift-refactor.git