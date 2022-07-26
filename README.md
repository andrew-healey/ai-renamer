# Renaming Tool - Monorepo

Intended to become a solid AI renaming tool for JS with current technology.

Basic structure is OpenAI Codex + grease + some lower-quality renamer.

This renamer might be a custom/modern/JS-friendly recreation of JSNice, or JSNice + grease, or a reimplementation of JSNeat, or something of my own.

## Clone

```sh
git clone --recurse-submodules https://github.com/andrew-healey/ai-renamer.git
```

## Build/Install

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
cd full-renaming
touch .env
echo "CODEX_KEY=" > .env
```

Enter your OpenAI Codex API key in `.env`.

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

**JSNeat**

> This extraction method only works with JSNeat. It does *not* work with Nice2Predict.

```sh
node JSNeat/train_set.js --dir $TRAINING_DIR --out neat_data
```

**UnuglifyJS**

You'll turn your UnuglifyJS source files and `node_modules/` folder into the training set.

```sh
cd UnuglifyJS/
./extract_features.py --dir $TRAINING_DIR > ../training_data
```

This should create a file of features named `training_data/` at the top level of the monorepo.

**Custom frontend - Generate training set**

My own parser, running on UnuglifyJS's source code as well.

```sh
node n2p-frontend/generate_dataset.js --dir $TRAINING_DIR > ./training_data
```

### Nice2Predict

**Training**

```sh
export BASE_PATH=$(pwd)
cd Nice2Predict/
bazel run n2p/training/train_json -- --logtostderr -num_threads 16 --input $BASE_PATH/training_data --out_model $BASE_PATH/model/
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