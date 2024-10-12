target "default" {
  context = "."
  dockerfile = "Dockerfile"
   = {
  }
annotations = ["org.opencontainers.image.description=Wx chapter opener"]
  tags = ["ghcr.io/rdartus/automate-wx:latest"]
  platforms = ["linux/amd64", "linux/arm64"]
}
