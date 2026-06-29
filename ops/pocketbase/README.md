# PocketBase operations

These files are the production reference for running PocketBase on the VPS.

Goals:

- run PocketBase as the dedicated `pocketbase` user, not as `root`;
- keep the service bound to `127.0.0.1:8090` behind nginx;
- create daily backups of `pb_data` and `pb_migrations`;
- retain local backups for 14 days by default.

Install/update on the VPS:

```bash
adduser --system --group --home /opt/pocketbase --no-create-home pocketbase
chown -R pocketbase:pocketbase /opt/pocketbase
mkdir -p /opt/backups/pocketbase
chown -R pocketbase:pocketbase /opt/backups/pocketbase

install -o root -g root -m 0644 ops/pocketbase/pocketbase.service /etc/systemd/system/pocketbase.service
install -o root -g root -m 0755 ops/pocketbase/backup-pocketbase.sh /opt/pocketbase/backup-pocketbase.sh
install -o root -g root -m 0644 ops/pocketbase/pocketbase-backup.service /etc/systemd/system/pocketbase-backup.service
install -o root -g root -m 0644 ops/pocketbase/pocketbase-backup.timer /etc/systemd/system/pocketbase-backup.timer

systemctl daemon-reload
systemctl restart pocketbase
systemctl enable --now pocketbase pocketbase-backup.timer
systemctl status pocketbase --no-pager
systemctl list-timers pocketbase-backup.timer --no-pager
```

Manual backup test:

```bash
systemctl start pocketbase-backup.service
ls -lh /opt/backups/pocketbase
curl -s https://pb.habbone.fr/api/health
```
