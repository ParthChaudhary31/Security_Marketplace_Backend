
import { expect } from 'chai';
import request from 'supertest';
import Server from '../server';
Server.listen(9000);

describe('user Controller', () => {
  it('register with new email: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/register')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        firstName: "dfuer",
        lastName: "qwert",
        password: "Asdervf@12r",
        confirmPassword: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
  })

  it('register with empty email: Fail', async () => {
    // case 2: empty email
    let response1 = await request(Server.app)
      .post('/api/v1/register')
      .send({
        emailAddress: "",
        firstName: "dfuer",
        lastName: "qwert",
        password: "Asdervf@12r",
        confirmPassword: "Asdervf@12r"
      })
    expect(response1.status).to.be.eq(500);
    expect(response1.body.message).to.be.equal('EmailAddress validation failed')
  })

  it('register with empty password: Fail', async () => {

    // case 3 : empty password
    let response2 = await request(Server.app)
      .post('/api/v1/register')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        firstName: "dfuer",
        lastName: "qwert",
        password: "",
        confirmPassword: ""
      })
    expect(response2.status).to.be.eq(500);
    expect(response2.body.message).to.be.equal('Password validation failed')
  })

  it('register with mismatched passwords: Fail', async () => {

    // case 3 : empty password
    let response3 = await request(Server.app)
      .post('/api/v1/register')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        firstName: "dfuer",
        lastName: "qwert",
        password: "1234567890AA",
        confirmPassword: "1234567890A"
      })
    expect(response3.status).to.be.eq(500);
    expect(response3.body.message).to.be.equal('Password validation failed');

  })

  it('re-register with same email: Fail', async () => {
    let response = await request(Server.app)
      .post('/api/v1/register')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        firstName: "dfuer",
        lastName: "qwert",
        password: "Asdervf@12r",
        confirmPassword: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(500);
  })

  it('login with registered email: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    console.log("response.message", response.body)
  })

  it('login with empty email: Fail', async () => {
    // case 2: empty email
    let response1 = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "",
        password: "Asdervf@12r"
      })
    expect(response1.status).to.be.eq(400);
    expect(response1.body.message).to.be.equal('Check Your Email And Password')
  })

  it('login with empty password: Fail', async () => {
    // case 3 : empty password
    let response2 = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: ""
      })
    expect(response2.status).to.be.eq(400);
    expect(response2.body.message).to.be.equal('Wrong Password Entered')
  })

  it('login with registered email and wrong password: Fail', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asder1vf@12r"
      })
    expect(response.status).to.be.eq(400);
    // expect(response.body.data.emailAddress).to.be.eq("áwerty@yopmail.com");
    // console.log("response.message",response.body.data)
  })
  it('login with unregistered email: Fail', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áwe1rty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(400);
    console.log(response, ".#################");
  })

  it('update profile  with registered email after login: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
      .expect(200)
    let obj = {
      emailAddress: "áweraaty@yopmail.com",
      walletAddress: "5En7yhgG9E8vCrnyZMdxc7ToJdYqRyeCzfgjNXoAS8rkG16r",
      firstName: "admin",
      lastName: "qwerfty",
      gitHub: "https://github.com/Sriharsh1103",
      bio: "good guy ultra max pro"

    }

    console.log("login data", response.body.token)
    let response1 = await request(Server.app)
      .post('/api/v1/updateProfile')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200);
    // expect(response.body.data.emailAddress).to.be.eq(String(obj.emailAddress));
    console.log("response.message", response1.body)
  })

  it.skip('change password  with registered email after login: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
      .expect(200)

    let obj = {
      emailAddress: "áweraaty@yopmail.com",
      oldPassword: "Asdervf@12r",
      newPassword: "Asdervf@@@123456",
      confirmPassword: "Asdervf@@@123456"
    }
    await request(Server.app)
      .post('/api/v1/updatePassword')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)
  })

  it('getUser  with registered email after login: Pass', async () => {
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áwerty@yopmail.com",
        password: "qwertyuiop11@AB"
      })
      .expect(200)
    let obj = {
      emailAddress: "áwerty@yopmail.com"
    }
    await request(Server.app)
      .post('/api/v1/getUserInfo')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)
  })

  it('Register audit', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com",
      auditType: ["smartContractAudit", "DoublePenetration"],
      gitHub: "https://github.com/pass-the-baton/derivatives/tree/main/contractsgithub.com",
      offerAmount: 1,
      estimatedDelivery: "05/10/2023",
      description: "great project",
      socialLink: "googlecom"
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    // console.log("response.message",response.body)

    let response1 = await request(Server.app)
      .post('/api/v1/registerAudit')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })

  it('Get details of all audit PUBLIC', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com"
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    // console.log("response.message",response.body)

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
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    // console.log("response.message",response.body)

    let response1 = await request(Server.app)
      .post('/api/v1/getDetailsOfAllAuditsPublic')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })

  it('Update Audit Status', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com",
      postID: 86933,
      status: "IN_PROGRESS"
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    // console.log("response.message",response.body)

    let response1 = await request(Server.app)
      .post('/api/v1/updateAuditStatus')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })

  it('Update Auditor ID', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com",
      postID: 67974,
      auditorEmail: "áweraaty@yopmail.com"
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    // console.log("response.message",response.body)

    let response1 = await request(Server.app)
      .post('/api/v1/updateAuditorID')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);


  })


  it('Two Factor Authentication', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com"
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    // console.log("response.message",response.body)

    let response1 = await request(Server.app)
      .post('/api/v1/twoFactorAuthentication')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })

  it('Verify Two Factor Authentication', async () => {

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "aweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("aweraaty@yopmail.com");
    // console.log("response.message",response.body.token)

    let response1 = await request(Server.app)
      .post('/api/v1/twoFactorAuthentication')
      .set("authorization", response.body.token)
      .send({
        emailAddress: "aweraaty@yopmail.com"
      })
      .expect(200)

    console.log("response of 2FA...#######################3", response1.body);

    let obj = {
      emailAddress: "aweraaty@yopmail.com",
      secret: response1.body.secret,
      otp: 998926
    }

    let response2 = await request(Server.app)
      .post('/api/v1/verifytwoFactorAuthentication')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...#######################3", response2.body);
  })


  it('Get Details of Audit', async () => {
    let obj = {
      emailAddress: "áweraaty@yopmail.com",
      postID: 86933
    }

    let response = await request(Server.app)
      .post('/api/v1/login')
      .send({
        emailAddress: "áweraaty@yopmail.com",
        password: "Asdervf@12r"
      })
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");
    // console.log("response.message",response.body)

    let response1 = await request(Server.app)
      .post('/api/v1/getDetailsOfAudit')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })
})