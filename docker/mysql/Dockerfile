FROM mysql:8.0

# UTF-8 by default for server + client
ENV LANG=C.UTF-8

# Init scripts placed in init/ run automatically the first time
# the container boots against an empty data directory.
COPY init/ /docker-entrypoint-initdb.d/

# Sensible server-side defaults for charset / collation
CMD ["mysqld", "--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci"]

EXPOSE 3306
