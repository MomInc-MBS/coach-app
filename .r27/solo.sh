# bash .r27/solo.sh <repo> <out> — run each failed file alone
cd "$1"; : > "$2"
while read f; do f=${f%$''}; [ -n "$f" ] && { echo "### $f" >> "$2"; node --test "$f" >> "$2" 2>&1; }; done < /d/myr5-work/r27-body-save/.r27/gate-failed-files.txt
echo DONE >> "$2"
