
import { expect } from 'chai';
import Server from '../server';
import config from "./config";
import supertest from 'supertest';
import userModel from '../models/user.model';
import mongoose from 'mongoose';
import request from 'supertest';
Server.listen(9000);


beforeEach(async () => {
  await mongoose.connect("mongodb://localhost:27017/JestDB"

  )
}

);

// afterEach(async () => {
//   await mongoose.connection.db.dropDatabase(( {
//     mongoose.connection.close()
//   });
// });
// test("Post /api/v1/register", async () => {

//   const registerData = {
//     emailAddress: "antier@gmail.com",
//     firstName: "Antier",
//     password: "Antier@123",
//     confirmPassword: "Antier@123"
//   }
//   await supertest(Server.app).post('/api/v1/register')
//     .send(registerData)
//     .expect(200)
//     .then(async (response) => {
//       expect(response.body.emailAddress).to.be("antier@gmail.com")
//       expect(response.body.firstName).to.be(registerData.firstName)
//       expect(response.body.confirmPassword).to.be(registerData.confirmPassword)
//       expect(response.body.password).to.be(registerData.password)

//       const mongoData = await userModel.findOne({ firstName: response.body.firstName, emailAddress: response.body.emailAddress })
//       expect(mongoData?.firstName).to.be(registerData.firstName)
//       expect(mongoData?.emailAddress).to.be(registerData.emailAddress)

//     })
// })


describe('user Controller', () => {
  it('register with new email: Pass', async () => {
    //  enter again new email id to register 

    const registerData = {
      emailAddress: "loginData@gmail.com",
      firstName: "loginData",
      password: "loginData@123",
      confirmPassword: "loginData@123"
    }
    let response = await request(Server.app)
      .post('/api/v1/register')
      .send(registerData)
    // .send(config.REGISTER_PAYLOAD_CASE_1)
    expect(response.status).to.be.eq(200);
    expect(response.body.message).to.be.eq('Registered Successfully.')
  })

  it('register with empty email: Fail', async () => {
    // case 2: empty email

    const registerData = {
      emailAddress: "",
      firstName: "Antier",
      password: "Antier@123",
      confirmPassword: "Antier@123"
    }
    let response1 = await request(Server.app)
      .post('/api/v1/register')
      .send(registerData)
    expect(response1.status).to.be.eq(500);
    expect(response1.body.message).to.be.eq('Please enter a valid email')
  })

  it('register with empty password: Fail', async () => {

    const registerData = {
      emailAddress: "aaantier@gmail.com",
      firstName: "Antier",
      password: "",
      confirmPassword: "Antier@123"
    }
    // case 3 : empty password
    let response2 = await request(Server.app)
      .post('/api/v1/register')
      .send(registerData)
    expect(response2.status).to.be.eq(500);
    expect(response2.body.message).to.be.equal('Please enter a valid password')
  })

  it('register with mismatched passwords: Fail', async () => {
    const registerData = {
      emailAddress: "aaantier@gmail.com",
      firstName: "Antier",
      password: "Antier@123",
      confirmPassword: "Antier@1234"
    }
    // case 3 : empty password
    let response3 = await request(Server.app)
      .post('/api/v1/register')
      .send(registerData)
    expect(response3.status).to.be.eq(500);
    expect(response3.body.message).to.be.equal('Email Already Used.');

  })

  it('re-register with same email: Fail', async () => {

    const registerData = {
      emailAddress: "aaantier@gmail.com",
      firstName: "Antier",
      password: "Antier@123",
      confirmPassword: "Antier@1234"
    }
    let response = await request(Server.app)
      .post('/api/v1/register')
      .send(registerData)
    expect(response.status).to.be.eq(500);
    expect(response.body.message).to.be.equal('Email Already Used.');
  })

  it('login with registered email: Pass', async () => {

    const registerData = {
      emailAddress: "aantier@gmail.com",
      password: "Antier@123",
    }
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(registerData)
    expect(response.status).to.be.eq(200);
    expect(response.body.data.emailAddress).to.be.eq(registerData.emailAddress);
    console.log("response.message", response.body)
    expect(response.body.message).to.be.equal('Logged In Successfully.');
  })

  // it('login with empty email: Fail', async () => {
  //   // case 2: empty email

  //   const registerData = {
  //     emailAddress: "",
  //     password: "Antier@123",
  //   }
  //   let response = await request(Server.app)
  //     .post('/api/v1/login')
  //     .send(registerData)

  //   expect(response.status).to.be.eq(400);
  //   expect(response.body.message).to.be.equal('Please enter a valid email')
  // })

  // it('login with empty password: Fail', async () => {
  //   // case 3 : empty password
  //   const registerData = {
  //     emailAddress: "antier@gmail.com",
  //     password: "",
  //   }
  //   let response2 = await request(Server.app)
  //     .post('/api/v1/login')
  //     .send(registerData)
  //   expect(response2.status).to.be.eq(400);
  //   expect(response2.body.message).to.be.equal('Please enter a valid password')
  // })

  // it('login with registered email and wrong password: Fail', async () => {
  //   const registerData = {
  //     emailAddress: "aantier@gmail.com",
  //     password: "hello@123",
  //   }
  //   let response = await request(Server.app)
  //     .post('/api/v1/login')
  //     .send(registerData)
  //   expect(response.status).to.be.eq(400);
  //   expect(response.body.data.emailAddress).to.be.eq("antier@gmail.com");
  //   // expect(response.body.data.password).to.be.eq(registerData.password);
  //   console.log("response.message", response.body.data)
  // })

  it('login with unregistered email: Fail', async () => {
    const registerData = {
      emailAddress: "aaaaantier@gmail.com",
      password: "hello@123",
    }
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(registerData)
    expect(response.status).to.be.eq(400);
    expect(response.body.message).to.be.equal('User Not Found.Please Register Yourself First.');
    console.log(response, ".#################");
  })

  it('update profile  with registered email after login: Pass', async () => {

    //  need to include message in the response.ts UpdateProfile:"User Profile Update"

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
    expect(response.body.message).to.be.equal('Logged In Successfully.');
    // expect(response.body.data.emailAddress).to.be.eq(String(obj.emailAddress));
    console.log("response.message", response1.body)
  })

  //  pass test we need to change  password after login 
  it.skip('change password  with registered email after login: Pass', async () => {

    const registerData = {
      emailAddress: "changePassword@gmail.com",
      password: "changePassword@123",
    }
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(registerData)
      .expect(200)

    const updatePassword = {
      emailAddress: "changePassword@gmail.com",
      oldPassword: "changePassword@123",
      newPassword: "changePassword@1234",
      confirmPassword: "changePassword@1234",
    }
    await request(Server.app)
      .post('/api/v1/updatePassword')
      .set("authorization", response.body.token)
      .send(updatePassword)
      .expect(200)

    expect(response.body.message).to.be.equal('Logged In Successfully.');
  })

  it.skip('getUser  with registered email after login: Pass', async () => {
    const registerData = {
      emailAddress: "aaantier@gmail.com",
      password: "Antier@123",
    }
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(registerData)
      .expect(200)
    let obj = {
      emailAddress: "aaantier@gmail.com",
    }
    await request(Server.app)
      .post('/api/v1/getUserInfo')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    // expect(response.body.message).to.be.equal('Logged In Successfully.');
  })

  it('Register audit', async () => {
    // const registerData = {
    //   emailAddress: "changePassword@gmail.com",
    //   password: "changePassword@123",
    // }
    const registerData = {
      emailAddress: "loginData@gmail.com",
      password: "loginData@123",
    }
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(registerData)

    expect(response.status).to.be.eq(200);

    let REGISTER_AUDIT_PAYLOAD_CASE_1 = {
      auditType: ["smartContractAudit", "DoublePenetration"],
      gitHub: "https://github.com/pass-the-baton/derivatives/tree/main/contractsgithub.com",
      offerAmount: 10,
      estimatedDelivery: "15/12/2023",
      description: "great project",
      socialLink: "google.com",
      emailAddress: "loginData@gmail.com",
      salt: 1234,
    }

    let response1 = await request(Server.app)
      .post('/api/v1/registerAudit')
      .set("authorization", response.body.token)
      .send(REGISTER_AUDIT_PAYLOAD_CASE_1)

    expect(response1.status).to.be.eq(200)

    console.log("response ...", response1.body);
  })

  it('Get details of all audit PUBLIC', async () => {


    // const loginData = {
    //   emailAddress: "aaantier@gmail.com",
    //   password: "Antier@123",
    // }
    const registerData = {
      emailAddress: "loginData@gmail.com",
      password: "loginData@123",
    }
    let response = await request(Server.app)
      .post('/api/v1/login')
      .send(registerData)

    expect(response.status).to.be.eq(200);

    // expect(response.body.data.emailAddress).to.be.eq("loginData@gmail.com");

    let obj = {
      emailAddress: "loginData@gmail.com",

    }
    let response1 = await request(Server.app)
      .post('/api/v1/getDetailsOfAllAuditsPublic')
      .set("authorization", response.body.token)
      .send(obj)
      .expect(200)

    console.log("response ...", response1.body);
  })

  // it('Get details of all audit', async () => {
  //   let obj = {
  //     emailAddress: "áweraaty@yopmail.com"
  //   }

  //   let response = await request(Server.app)
  //     .post('/api/v1/login')
  //     .send(config.LOGIN_PAYLOAD_CASE_1)
  //   expect(response.status).to.be.eq(200);
  //   expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");

  //   let response1 = await request(Server.app)
  //     .post('/api/v1/getDetailsOfAllAuditsPublic')
  //     .set("authorization", response.body.token)
  //     .send(obj)
  //     .expect(200)

  //   console.log("response ...", response1.body);
  // })

  // it('Update Audit Status', async () => {
  //   let response = await request(Server.app)
  //     .post('/api/v1/login')
  //     .send(config.LOGIN_PAYLOAD_CASE_1)
  //   expect(response.status).to.be.eq(200);
  //   expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");

  //   let response1 = await request(Server.app)
  //     .post('/api/v1/updateAuditStatus')
  //     .set("authorization", response.body.token)
  //     .send(config.UPDATE_AUDIT_STATUS_PAYLOAD_CASE_1)
  //     .expect(200)

  //   console.log("response ...", response1.body);
  // })

  // it('Update Auditor ID', async () => {
  //   let response = await request(Server.app)
  //     .post('/api/v1/login')
  //     .send(config.LOGIN_PAYLOAD_CASE_1)
  //   expect(response.status).to.be.eq(200);
  //   expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");

  //   let response1 = await request(Server.app)
  //     .post('/api/v1/updateAuditorID')
  //     .set("authorization", response.body.token)
  //     .send(config.UPDATE_AUDIT_ID_PAYLOAD_CASE_1)
  //     .expect(200)

  //   console.log("response ...", response1.body);


  // })


  // it('Get Details of Audit', async () => {
  //   let response = await request(Server.app)
  //     .post('/api/v1/login')
  //     .send(config.LOGIN_PAYLOAD_CASE_1)
  //   expect(response.status).to.be.eq(200);
  //   expect(response.body.data.emailAddress).to.be.eq("áweraaty@yopmail.com");

  //   let response1 = await request(Server.app)
  //     .post('/api/v1/getDetailsOfAudit')
  //     .set("authorization", response.body.token)
  //     .send(config.GET_DETAILS_AUDIT_CASE_1)
  //     .expect(200)

  //   console.log("response ...", response1.body);
  // })
})