# wext
Caching system for the damn slow Intranet ext. Lookup Web site http://ext.wistron.com.tw/.
# Features
PSB: peers, subordinates, chain of bosses.<br>
Show PSB when exactly matched or only one target person found.<br>
Show peers known so far in cache.<br>
Show subordinates known so far in cache.<br>
Retry InitialGet() if failed before.<br>
Click on Chinese/English name or boss name then show the details.<br>
Sort peers and subordinates.<br>
Click on department id then fetch new members.<br>
Manually delete entry.<br>
Go back/forward. To be refined - If-Modified-Since?<br>
Pretty and compact JSON string.
# Insight
Use async function for the first time. Quite useful.<br>
JSON.parse() cannot handle too long string. Use JSONStream instead.
### TODO
Show peers known so far. And prefetch others?<br>
Limit flushing database only once within 10? minutes.<br>
Combine employee ID search in LDAP?<br>

### BUGS
竟然有兩個 Tony Chang? It's a system bug! Make me do special handling for it.<br>
WHC 8500+ 張竣淵 / TONY CHANG 1R9100 硬體研發一部<br>
WHC 8500+ 張子鑫 / TONY CHANG N00000 副董事長暨新事業總經理<br>

原本假設系統傳回的英文名都是大寫，今天2021/1/5居然碰到例外: 張悅 / Zoey<br>
System fixed it before 1/11.<br>
