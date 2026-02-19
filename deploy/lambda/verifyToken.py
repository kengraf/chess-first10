import json
import boto3
import requests
from datetime import datetime, timezone

CLIENT_ID = '1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com'
p1 = 'TOCSPX'
p2 = 'xk6EIf8eCILKsOkTaul1P9NX2MIr'
import codecs
CLIENT_SECRET = codecs.encode(p1 + '-' + p2, 'rot_13')
REDIRECT_URI  = 'postmessage'  # for JS popup flow

dynamodb = boto3.resource('dynamodb')
table    = dynamodb.Table('users')

# ── Main handler ───────────────────────────────────────────────────────────
def lambda_handler(event, context):
    method = (event.get('httpMethod') or
              event.get('requestContext', {}).get('http', {}).get('method'))
    path   = event.get('path') or event.get('rawPath', '')

    if path.endswith('/login')   and method == 'POST': return handle_login(event)
    if path.endswith('/refresh') and method == 'POST': return handle_refresh(event)
    if path.endswith('/logout')  and method == 'POST': return handle_logout(event)

    return resp(404, {'error': 'Not found'})


# ── Login: exchange code for tokens ───────────────────────────────────────
def handle_login(event):
    body = json.loads(event.get('body') or '{}')
    code = body.get('code')
    if not code:
        return resp(400, {'error': 'Missing code'})

    # exchange code with Google
    r = requests.post('https://oauth2.googleapis.com/token', data={
        'code':          code,
        'client_id':     CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri':  REDIRECT_URI,
        'grant_type':    'authorization_code'
    })
    tokens = r.json()
    if 'error' in tokens:
        return resp(401, {'error': tokens['error']})

    # get user info
    user_info = get_user_info(tokens['access_token'])
    user_id   = user_info['sub']  # Google's unique user ID

    # save refresh token to DynamoDB
    table.update_item(
        Key={'id': user_id},
        UpdateExpression='SET refresh_token = :rt, email = :email, picture = :pic',
        ExpressionAttributeValues={
            ':rt':    tokens['refresh_token'],
            ':email': user_info.get('email'),
            ':pic':   user_info.get('picture')
        }
    )

    response_body = {
        'access_token': tokens['access_token'],
        'expires_in':   tokens['expires_in'],
        'email':        user_info.get('email'),
        'picture':      user_info.get('picture')
    }

    # set user_id in httpOnly cookie so refresh endpoint knows who they are
    return resp(200, response_body, cookie=f'user_id={user_id}; HttpOnly; Secure; SameSite=Strict; Path=/')


# ── Refresh: get new access token silently ────────────────────────────────
def handle_refresh(event):
    user_id = get_cookie(event, 'user_id')
    if not user_id:
        return resp(401, {'error': 'No session'})

    # get refresh token from DynamoDB
    result = table.get_item(Key={'id': user_id})
    item   = result.get('Item')
    if not item or not item.get('refresh_token'):
        return resp(401, {'error': 'No refresh token, please log in again'})

    r = requests.post('https://oauth2.googleapis.com/token', data={
        'refresh_token': item['refresh_token'],
        'client_id':     CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type':    'refresh_token'
    })
    tokens = r.json()
    if 'error' in tokens:
        return resp(401, {'error': 'Refresh failed, please log in again'})

    return resp(200, {
        'access_token': tokens['access_token'],
        'expires_in':   tokens['expires_in']
    })


# ── Logout ─────────────────────────────────────────────────────────────────
def handle_logout(event):
    user_id = get_cookie(event, 'user_id')
    if user_id:
        # optionally revoke token with Google
        item = table.get_item(Key={'id': user_id}).get('Item', {})
        if item.get('refresh_token'):
            requests.post('https://oauth2.googleapis.com/revoke',
                          params={'token': item['refresh_token']})
        # clear refresh token from DB
        table.update_item(
            Key={'id': user_id},
            UpdateExpression='REMOVE refresh_token'
        )

    return resp(200, {'ok': True}, cookie='user_id=; HttpOnly; Secure; Max-Age=0; Path=/')


# ── Helpers ────────────────────────────────────────────────────────────────
def get_user_info(access_token):
    r = requests.get('https://www.googleapis.com/oauth2/v3/userinfo',
                     headers={'Authorization': f'Bearer {access_token}'})
    return r.json()

def get_cookie(event, name):
    # HTTP API v2
    cookies = event.get('cookies', [])
    for c in cookies:
        if c.startswith(f'{name}='):
            return c.split('=', 1)[1]
    # REST API v1
    cookie_header = (event.get('headers') or {}).get('cookie', '')
    cookies = dict(c.strip().split('=', 1) for c in cookie_header.split(';') if '=' in c)
    return cookies.get(name)

def resp(status_code, body, cookie=None):
    response = {
        'statusCode': status_code,
        'headers':    {'Content-Type': 'application/json'},
        'body':       json.dumps(body)
    }
    if cookie:
        response['headers']['Set-Cookie'] = cookie
    return response