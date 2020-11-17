sudo apt-get update
sudo apt install -y docker.io
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -a -G docker $USER
