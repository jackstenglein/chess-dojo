package database

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

// MediaStore provides an interface for saving media.
type MediaStore interface {
	// UploadImage saves the provided image data at the provided key.
	// The image is saved in the default bucket for pictures.
	UploadImage(key, imageData string) error

	// CopyImageFromURL copies the image from the provided url to the media
	// store at the provided key. The image is saved in the default bucket for
	// pictures.
	CopyImageFromURL(url, key string) error

	// DeleteImage deletes the image with the provided key.
	// The default picture bucket is used.
	DeleteImage(key string) error

	// Download fetches the file from the provided bucket and key
	// and writes it to the given file.
	Download(bucket, key string, file *os.File) error
}

// s3MediaStore implements a media store using AWS S3.
type s3MediaStore struct {
	uploader   *s3manager.Uploader
	downloader *s3manager.Downloader
}

// S3 implements an AWS S3 media store using the default AWS session.
var S3 = &s3MediaStore{
	uploader:   s3manager.NewUploader(sess),
	downloader: s3manager.NewDownloader(sess),
}

var picturesBucket = fmt.Sprintf("chess-dojo-%s-pictures", stage)

// UploadImage saves the provided image data at the provided key.
// The image is saved in the default bucket for pictures.
func (ms *s3MediaStore) UploadImage(key, imageData string) error {
	decoded, err := base64.StdEncoding.DecodeString(imageData)
	if err != nil {
		return errors.Wrap(400, "Invalid request: image data could not be base64 decoded", "", err)
	}

	_, err = ms.uploader.Upload(&s3manager.UploadInput{
		Bucket: new(picturesBucket),
		Key:    new(key),
		Body:   bytes.NewReader(decoded),
	})
	return errors.Wrap(500, "Temporary server error", "Failed to upload image", err)
}

// CopyImageFromURL copies the image from the provided url to the media
// store at the provided key. The image is saved in the default bucket for
// pictures.
func (ms *s3MediaStore) CopyImageFromURL(url, key string) error {
	response, err := http.Get(url)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Failed to fetch image", err)
	}
	defer response.Body.Close()

	_, err = ms.uploader.Upload(&s3manager.UploadInput{
		Bucket: new(picturesBucket),
		Key:    new(key),
		Body:   response.Body,
	})
	return errors.Wrap(500, "Temporary server error", "Failed to upload image", err)
}

// DeleteImage deletes the image with the provided key.
// The default picture bucket is used.
func (ms *s3MediaStore) DeleteImage(key string) error {
	_, err := ms.uploader.S3.DeleteObject(&s3.DeleteObjectInput{
		Bucket: new(picturesBucket),
		Key:    new(key),
	})
	return errors.Wrap(500, "Temporary server error", "Failed to delete image", err)
}

// Download fetches the file from the provided bucket and key
// and writes it to the given file.
func (ms *s3MediaStore) Download(bucket, key string, file *os.File) error {
	_, err := ms.downloader.Download(file, &s3.GetObjectInput{
		Bucket: new(bucket),
		Key:    new(key),
	})
	return errors.Wrap(500, "Temporary server error", "Failed to download file", err)
}
