# cd Documents/aws
# ssh -i .\adPlusKey.pem ubuntu@54.180.2.23 --- cmd에서 우분투 접속

# sudo nano /etc/nginx/sites-available/adplus --- cmd에서 nginx 우회수정

# chmod +x ~/apps/AdEntry/deploy.sh --- sh준비
# ~/apps/AdEntry/deploy.sh --- sh실행
# sudo nginx -t && sudo systemctl reload nginx --- 적용
# pm2 restart adentry --- 재실행

# git fetch --all --prune
# git pull --ff-only origin "main"
# sudo nginx -t && sudo systemctl reload nginx --- 적용
# pm2 restart adentry --- 재실행