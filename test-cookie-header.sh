#!/bin/bash

# Use the cookies from the previous test
cat > cookies-test.txt << 'COOKIES'
# Netscape HTTP Cookie File
#HttpOnly_localhost	FALSE	/	FALSE	1761651977	refreshToken	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZkZGJhNGI5LTU3OGMtNDI1Ni04NTI2LTg1MjI0NjBkYjc0MCIsImp0aSI6ImE4OGE5ZWI2MjFmZWRiOWY0ZTZmZjY4MGNlOTZlOWVhIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEwNDcxNzcsImV4cCI6MTc2MTY1MTk3NywiYXVkIjoibWVkaW8tdXNlcnMiLCJpc3MiOiJtZWRpby1wbGF0Zm9ybSJ9.u-4cLkXozwlPsSU6aUrFMKsNCZE-G5MG5US-CETwKVE
#HttpOnly_localhost	FALSE	/	FALSE	1761048077	authToken	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZkZGJhNGI5LTU3OGMtNDI1Ni04NTI2LTg1MjI0NjBkYjc0MCIsImVtYWlsIjoiYmFja2VuZC1kaXJlY3QtMTc2MTA0NzE3NjkyNC11cTZxNGtAZXhhbXBsZS5jb20iLCJqdGkiOiIwNGIyMTEyNTkzNWU2YTg5NzYxOTAxYzc0OTM3NWM1NCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjEwNDcxNzcsImV4cCI6MTc2MTA0ODA3NywiYXVkIjoibWVkaW8tdXNlcnMiLCJpc3MiOiJtZWRpby1wbGF0Zm9ybSJ9.H2_PuXufvkH55pw9Y8_SZuU7jWyjBq9oJDLts_V66r8
#HttpOnly_localhost	FALSE	/	FALSE	0	_csrf	a7v2EJPepGQ2OmidaI3hBzDD
COOKIES

echo "=== Testing /api/auth/me with verbose curl ==="
curl -v -b cookies-test.txt http://localhost:5000/api/auth/me 2>&1 | grep -E "Cookie:|< HTTP"

rm -f cookies-test.txt
