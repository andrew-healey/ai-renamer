# Renaming Tool - Monorepo

Intended to become a solid AI renaming tool for JS with current technology.

Basic structure is OpenAI Codex + grease + some lower-quality renamer.

This renamer might be a custom/modern/JS-friendly recreation of JSNice, or JSNice + grease, or a reimplementation of JSNeat, or something of my own.

## Clone

```sh
git clone --recurse-submodules https://github.com/andrew-healey/ai-renamer.git
```

## Build/Install

### OpenAI

```sh
pip install --user openai
touch .env
echo "CODEX_KEY=" > .env
echo "FINE_TUNE=" > .env
```

Put your OpenAI Codex API key in `.env`.

### Nice2Predict

```sh
cd Nice2Predict/
sudo apt-get install libmicrohttpd-dev libcurl4-openssl-dev bazel libgoogle-glog-dev libgflags-dev
bazel build //...
```

### UnuglifyJS

```sh
cd UnuglifyJS
npm i
```

> Installation can take a while (my most recent install took 11 minutes).

### UnuglifyJS Remake + Integrated Renamer Tool

```sh
npm i
```

## Details

My Bazel version is 5.2.0 on WSL - AMD64.
My version of `libmicrohttpd-dev` is `0.9.66-1`.

## Running

### Pick training set

**Custom training set**

Generate a training set from a list of JS Git repositories.
```sh
cd training/
```

Optionally, get the repositories first.
```sh
node get_repos.js
```

Now, download the repositories and set the `TRAINING_DIR` variable. This example downloads the top 50.
```sh
node download_repos.js 50
export TRAINING_DIR=$(pwd)/repos
```

**Use UnuglifyJS files (simple, small)**

```sh
export TRAINING_DIR=$(pwd)/UnuglifyJS
```

### Extract training features

**GPT/Codex Fine-tuning**

> This method creates a training set for Codex-based methods only. It will not work with Nice2Predict or JSNeat.

```sh
node codex/fine-tune.js --dir ./training/repos --out ./data/codex.jsonl
openai tools fine_tunes.prepare_data -f data/codex.jsonl
```
Follow the prompts. If it puts you in `pdb)`, then enter `continue`.
This should place `codex_prepared.jsonl` in the `data/` folder.

**JSNeat**

> This extraction method only works with JSNeat. It does *not* work with Nice2Predict.

```sh
node JSNeat/train_set.js --dir $TRAINING_DIR --out data/neat
```

**UnuglifyJS**

You'll turn your UnuglifyJS source files and `node_modules/` folder into the training set.

```sh
cd UnuglifyJS/
./extract_features.py --dir $TRAINING_DIR > ../data/n2p
```

This should create a file of features named `training_data/` at the top level of the monorepo.

**Custom frontend - Generate training set**

My own parser, running on UnuglifyJS's source code as well.

```sh
node n2p-frontend/generate_dataset.js --dir $TRAINING_DIR > ./data/n2p
```

### Nice2Predict

**Training**

```sh
export BASE_PATH=$(pwd)
cd Nice2Predict/
bazel run n2p/training/train_json -- --logtostderr -num_threads 16 --input $BASE_PATH/data/n2p --out_model $BASE_PATH/model/
```

This will create a folder `model/` at the monorepo level.

**Inference**

```sh
cd Nice2Predict/
bazel run //n2p/json_server /home/doolie/Projects/NodeJS/jsnice/model/ -- --logtostderr
```

This will get the JSON server running. Next, run the following to pull up an interface.

```sh
npx serve Nice2Predict/viewer
```

Now, go to `http://localhost:3000/viewer.html`.

### Codex

***Training***

Choose which size model you want to train on. Curie worked for me, for about $5.50. Then start a fine tune task with that model.
```sh
openai api fine_tunes.create -t codex_data_prepared.jsonl -m {ada,babbage,curie,davinci}
```
This will output a task ID.

Once it's started, you can show the run logs with the following.
```sh
openai api fine_tunes.follow -i <taskID>
```

Once it finishes, it will give you a model ID, like `curie:ft-personal-2022-08-02-06-51-01`. Place this in `.env` as `FINE_TUNE`.

***Inference***

I haven't finished inference yet, but you can run `node codex/test.js` for a demo.