# cd Documents/aws
# ssh -i .\room1stKey.pem ubuntu@3.39.194.110 --- cmd에서 우분투 접속

# sudo nano /etc/nginx/sites-available/adplus --- cmd에서 nginx 우회수정

# chmod +x ~/apps/gangnamking/deploy.sh --- sh준비
# ~/apps/gangnamking/deploy.sh --- sh실행
# sudo nginx -t && sudo systemctl reload nginx --- 적용
# pm2 restart room1st --- 재실행

# git fetch --all --prune
# git pull --ff-only origin "main"
# sudo nginx -t && sudo systemctl reload nginx --- 적용
# pm2 restart room1st --- 재실행