# Blood Pact's REST API
This API was written in Node & Express by Yulong Tan.

## Routes


### `get /drives/:zipcode`
- Gets the nearby drives with the given zipcode

### `get /groups`
- Gets all the groups

### `get /groups/:groupName`
- Gets the specific group

### `get /users/:uid/stats`
- Gets the specific user's stats

### `get /users/:uid/groups`
- Gets the specific user's groups

`post /groups/create`
- Creates a group
  ```json
  {
    "name": "Washington State University",
    "friendlyName": "testing",
    "createdDate": "2019-05-12",
    "members": 
      {
        "test": {
          "firstName": "test",
          "lastName": "test"
        }
        
      }
    ,
    "pintsDonated": 4
  }
  ```
`post /sms`
- SMS Endpoint for Twilio

`put /groups/:groupName/join`
- Adds user to group
  ```json
  {
    "uid": "ytango",
    "firstName": "Yulong",
    "lastName": "Tan"
  }
  ```

`put /groups/:groupName/leave`
- Removes user from group
  ```json
  {
    "uid": "some-uid"
  }
  ```

`delete /groups/:groupName`
- Deletes the group