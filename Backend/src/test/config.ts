
const config = {
  REGISTER_PAYLOAD_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    firstName: "dfuer",
    lastName: "qwert",
    password: "Asdervf@12r",
    confirmPassword: "Asdervf@12r"
  },
  REGISTER_PAYLOAD_CASE_2:{
    emailAddress: "",
    firstName: "dfuer",
    lastName: "qwert",
    password: "Asdervf@12r",
    confirmPassword: "Asdervf@12r"
  },
  REGISTER_PAYLOAD_CASE_3:{
    emailAddress: "áweraaty@yopmail.com",
    firstName: "dfuer",
    lastName: "qwert",
    password: "",
    confirmPassword: ""
  },
  REGISTER_PAYLOAD_CASE_4:{
        emailAddress: "áweraaty@yopmail.com",
        firstName: "dfuer",
        lastName: "qwert",
        password: "1234567890AA",
        confirmPassword: "1234567890A"
  },
  REGISTER_PAYLOAD_CASE_5:{
    emailAddress: "áweraaty@yopmail.com",
    firstName: "dfuer",
    lastName: "qwert",
    password: "Asdervf@12r",
    confirmPassword: "Asdervf@12r"
  },
  LOGIN_PAYLOAD_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    password: "Asdervf@12r"
  },
  LOGIN_PAYLOAD_CASE_2:{
    emailAddress: "",
    password: "Asdervf@12r"
  },
  LOGIN_PAYLOAD_CASE_3:{
    emailAddress: "áweraaty@yopmail.com",
    password: ""
  },
  LOGIN_PAYLOAD_CASE_4:{
    emailAddress: "áweraaty@yopmail.com",
    password: "Asder1vf@12r"
  },
  LOGIN_PAYLOAD_CASE_5:{
    emailAddress: "áwe1rty@yopmail.com",
    password: "Asdervf@12r"
  },
  UPDATE_PROFILE_PAYLOAD_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    walletAddress: "5En7yhgG9E8vCrnyZMdxc7ToJdYqRyeCzfgjNXoAS8rkG16r",
    firstName: "admin",
    lastName: "qwerfty",
    gitHub: "https://github.com/Sriharsh1103",
    bio: "good guy ultra max pro"
  },
  CHANGE_PASSWORD_PAYLOAD_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    oldPassword: "Asdervf@12r",
    newPassword: "Asdervf@@@123456",
    confirmPassword: "Asdervf@@@123456"
  },
  GET_USER_PAYLOAD_CASE_1:{
    emailAddress: "áwerty@yopmail.com"
  },
  REGISTER_AUDIT_PAYLOAD_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    auditType: ["smartContractAudit", "DoublePenetration"],
    gitHub: "https://github.com/pass-the-baton/derivatives/tree/main/contractsgithub.com",
    offerAmount: 1,
    estimatedDelivery: "05/10/2023",
    description: "great project",
    socialLink: "googlecom"
  },
  UPDATE_AUDIT_STATUS_PAYLOAD_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    postID: 86933,
    status: "IN_PROGRESS"
  },
  UPDATE_AUDIT_ID_PAYLOAD_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    postID: 67974,
    auditorEmail: "áweraaty@yopmail.com"
  },
  GET_DETAILS_AUDIT_CASE_1:{
    emailAddress: "áweraaty@yopmail.com",
    postID: 86933
  }


};
export default config;
