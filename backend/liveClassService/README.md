The Lambda function in `copyRecordings.ts` processes Google Meet recordings using [ffmpeg](https://ffmpeg.org/). The Lambda function requires that the ffmpeg CLI is installed.

To accomplish this, we use a [Lambda Layer](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html). The layer adds an installation of the ffmpeg CLI to `/opt/bin/ffmpeg` and ffprobe to `/opt/bin/ffprobe`. For the Lambda OS to detect the ffmpeg CLI, we add `/opt/bin/` to the `PATH` environment variable. Environment variables are set in the `serverless.yml` file.

The Lambda Layer also contains the [ChessDojo intro video](https://drive.google.com/file/d/1Mjr2gXRxkxGXhRw0TBb9vl7gCnJ6KOVW/view?usp=drive_link), in order to prepend the intro to the Google Meet recordings.

## Creating the Lambda Layer

1. Launch an EC2 instance with the Amazon Linux 2023 OS. You can use the smallest instance type/default settings.
1. Use scp to copy the intro video into the EC2 instance as `short_intro.mp4`.
1. SSH into the EC2 instance and run the following commands:

```shell
mkdir bin
mkdir data
curl -SL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg bin/ffmpeg
mv ffmpeg-*-amd64-static/ffprobe bin/ffprobe
mv short_intro.mp4 data
zip -r ffmpeg-layer.zip bin data
```

1. Use `scp` to pull the `ffmpeg-layer.zip` file from your EC2 instance to your local filesystem. Open ffmpeg-layer.zip and verify that it has the following structure:

```
bin/
  ffmpeg
  ffprobe
data/
  short_intro.mp4
```

The ffmpeg-layer.zip file is your Lambda layer.
