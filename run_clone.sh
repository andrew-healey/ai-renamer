echo $SUBREPO_KEY > /app/id_rsa_refactor

echo $(cat key_info.txt) > ~/.ssh/config

git clone git@github-refactor:andrew-healey/shift-refactor.git