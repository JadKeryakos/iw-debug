# Building Docker Image

- Clone the forked repo: [Link to Forked Repo](https://github.com/JadKeryakos/webviz-debug)
- Open terminal in repository
- Run:
```sh
sudo ./build_image.sh
```

# Running Docker Image

- Open terminal in repository
- Run:
```sh
sudo ./run.sh
```
- Open web browser with URL:
```sh
localhost:8080
```
- You should see something similar to this:

![alt text](https://github.com/JadKeryakos/webviz-debug/docs/pics/webviz-startup.png "Webviz Startup")

- On the top right you will find a button called `Config`, press into it 2 times you will find a JSON script
- Delete fully the previous JSON script and paste into it from `iwhub-layout.json`
- You should have something like this:

![alt text](https://github.com/JadKeryakos/webviz-debug/docs/pics/webviz_after_config.png "Webviz Config")

- Finally Drag and Drop and the bag file you wish to review onto the page

![alt text](https://github.com/JadKeryakos/webviz-debug/docs/pics/webviz_after_drop.png "Webviz Playback")