# Periodic NS.gifts catalog stock sync

Keeps the storefront in step with NS.gifts availability: re-runs
`scripts/ns-gifts/import-catalog.mjs`, which publishes only in-stock
denominations and unpublishes the rest. Runs on the whitelisted VPS (only it can
reach the NS.gifts API).

## Install (one-time, on the server as root)

```sh
sudo cp /home/lumo/app/deploy/lumo-catalog-sync.service /etc/systemd/system/
sudo cp /home/lumo/app/deploy/lumo-catalog-sync.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lumo-catalog-sync.timer
```

## Operate

```sh
systemctl list-timers lumo-catalog-sync.timer   # next/last run
sudo systemctl start lumo-catalog-sync.service  # run once now
journalctl -u lumo-catalog-sync.service -n 50   # last run's output
```

Interval is `OnUnitActiveSec` in the timer (default 15 min).

## Note

This is a first line of defence, not a real-time guarantee — NS.gifts stock can
change between syncs. A purchase-time stock check is still required before
charging (see the payment/fulfillment work).
