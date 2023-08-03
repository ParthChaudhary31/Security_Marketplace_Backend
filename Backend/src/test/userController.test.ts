
import { expect } from 'chai';
import request from 'supertest';
import Server from '../server';
import config from "./config";
Server.listen(9000);

describe('user Controller', () => {
  it('register with new email: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/register')
      .send(config.REGISTER_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    console.log("config",config.REGISTER_PAYLOAD_CASE_1,config.REGISTER_PAYLOAD_CASE_6)
    let response1 = await request(Server.app)
    .post('/api/v1/register')
    .send(config.REGISTER_PAYLOAD_CASE_6)
    expect(response1.status).to.be.eq(200);


  })

  it('register with empty email: Fail', async () => {
    // case 2: empty email
    let response1 = await request(Server.app)
      .post('/api/v1/register')
      .send(config.REGISTER_PAYLOAD_CASE_2)
    expect(response1.status).to.be.eq(500);
    expect(response1.body.message).to.be.equal('Please enter a valid email')
  })

  it('register with empty password: Fail', async () => {

    // case 3 : empty password
    let response2 = await request(Server.app)
      .post('/api/v1/register')
      .send(config.REGISTER_PAYLOAD_CASE_3)
    expect(response2.status).to.be.eq(500);
    expect(response2.body.message).to.be.equal('Please enter a valid password')
  })

  it('register with mismatched passwords: Fail', async () => {

    // case 3 : empty password
    let response3 = await request(Server.app)
      .post('/api/v1/register')
      .send(config.REGISTER_PAYLOAD_CASE_4)
    expect(response3.status).to.be.eq(500);
    expect(response3.body.message).to.be.equal('Please enter a valid password');

  })

  it('re-register with same email: Fail', async () => {
    let response = await request(Server.app)
      .post('/api/v1/register')
      .send(config.REGISTER_PAYLOAD_CASE_5)
    expect(response.status).to.be.eq(500);
  })

  it('login with registered email: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    console.log("response.message", response.body)
  })

  it('login with empty email: Fail', async () => {
    // case 2: empty email
    let response1 = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_2)
    expect(response1.status).to.be.eq(500);
    expect(response1.body.message).to.be.equal(' enter a valid email')
  })

  it('login with empty password: Fail', async () => {
    // case 3 : empty password
    let response2 = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_3)
    expect(response2.status).to.be.eq(500);
    expect(response2.body.message).to.be.equal(' enter a valid password')
  })

  it('login with registered email and wrong password: Fail', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_4)
    expect(response.status).to.be.eq(400);
    // expect(response.body.data.emailAddress).to.be.eq("áwerty@yopmail.com");
    // console.log("response.message",response.body.data)
  })
  it('login with unregistered email: Fail', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_5)
    expect(response.status).to.be.eq(400);
    console.log(response, ".#################");
  })

  it('update profile  with registered email after login: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_1)
      .expect(200)

    console.log("login data", response.body.token)
    let response1 = await request(Server.app)
      .post('/api/v1/updateProfile')
      .set("authorization", response.body.token)
      .send(config.UPDATE_PROFILE_PAYLOAD_CASE_1)
      .expect(200);
    // expect(response.body.data.emailAddress).to.be.eq(String(obj.emailAddress));
    console.log("response.message", response1.body)
  })



  it('getUser  with registered email after login: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_6)
      .expect(200)
    await request(Server.app)
      .post('/api/v1/getUserInfo')
      .set("authorization", response.body.token)
      .send(config.GET_USER_PAYLOAD_CASE_1)
      .expect(200)
  })

  it('Register audit', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");

    let response1 = await request(Server.app)
      .post('/api/v1/registerAudit')
      .set("authorization", response.body.token)
      .send(config.REGISTER_AUDIT_PAYLOAD_CASE_1)
      .expect(200)

    console.log("response ...", response1.body);
  })

  it('Get details of all audit PUBLIC', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com"
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");

    let response1 = await request(Server.app)
      .post('/api/v1/getDetailsOfAllAuditsPublic')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })

  it('Get details of all audit', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com"
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");

    let response1 = await request(Server.app)
      .post('/api/v1/getDetailsOfAllAuditsPublic')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })

  it('change password  with registered email after login: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.LOGIN_PAYLOAD_CASE_1)
      .expect(200)
    await request(Server.app)
      .post('/api/v1/updatePassword')
      .set("authorization", response.body.token)
      .send(config.CHANGE_PASSWORD_PAYLOAD_CASE_1)
      .expect(200)
  })

  it('Update Audit Status', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.NEW_LOGIN_CRED_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);

    let response1 = await request(Server.app)
    .post('/api/v1/registerAudit')
    .set("authorization", response.body.token)
    .send(config.REGISTER_AUDIT_PAYLOAD_CASE_1)
    .expect(200)
  let obj2 = {
    emailAddress: "áweraaty@yopmail.com",
    postID: response1.body.data.response.postID,
    status: "IN_PROGRESS"
  }
    let response12 = await request(Server.app)
      .post('/api/v1/updateAuditStatus')
      .set("authorization", response.body.token)
      .send(obj2)
      .expect(200)

  })

  it('Update Auditor ID', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(config.NEW_LOGIN_CRED_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    let response1 = await request(Server.app)
    .post('/api/v1/registerAudit')
    .set("authorization", response.body.token)
    .send(config.REGISTER_AUDIT_PAYLOAD_CASE_1)
    .expect(200)
  let obj2 = {
    emailAddress: "áweraaty@yopmail.com",
    postID: response1.body.data.response.postID,
    auditorEmail: "áweraaty123@yopmail.com"
  }
    let response12 = await request(Server.app)
      .post('/api/v1/updateAuditorID')
      .set("authorization", response.body.token)
      .send(obj2)
      .expect(200)
  })


  it('Get Details of Audit', async () => {
    let response = await request(Server.app)
    .post('/api/v1/login')
    .send(config.NEW_LOGIN_CRED_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    let response1 = await request(Server.app)
    .post('/api/v1/registerAudit')
    .set("authorization", response.body.token)
    .send(config.REGISTER_AUDIT_PAYLOAD_CASE_1)
    .expect(200)
    let obj2 = {
      emailAddress: "áweraaty@yopmail.com",
      postID: response1.body.data.response.postID
    }
    let response12 = await request(Server.app)
      .post('/api/v1/getDetailsOfAudit')
      .set("authorization", response.body.token)
      .send(obj2)
      .expect(200)

    console.log("response ...", response12.body);
  })
})