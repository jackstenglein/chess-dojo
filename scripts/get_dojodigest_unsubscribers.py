import boto3
import csv

db = boto3.resource('dynamodb')
table = db.Table('prod-users')

def handle_users(writer, users):
    for user in users:
        try:
            if user['notificationSettings']['emailNotificationSettings']['disableNewsletter']:
                writer.writerow(['Unknown', user['email'], 'Setting on user profile'])
        except Exception as e:
            print(e)


def main():
    with open('unsubscribers.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['time', 'email', 'reason'])
        try:
            res = table.scan()
            lastKey = res.get('LastEvaluatedKey', None)
            items = res.get('Items', []) 
            handle_users(writer, items)

            while lastKey != None:
                print(lastKey)
                res = table.scan(ExclusiveStartKey=lastKey)
                lastKey = res.get('LastEvaluatedKey', None)
                items = res.get('Items', [])
                handle_users(writer, items)
        except Exception as e:
            print(e)

if __name__ == '__main__':
    main()
