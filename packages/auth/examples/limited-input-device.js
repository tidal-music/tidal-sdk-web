import {
  finalizeDeviceLogin,
  init,
  initializeDeviceLogin,
  logout,
} from '../dist';

import { getUserInfo } from './shared';

window.addEventListener('load', () => {
  const form = document.getElementById('limitedInputDeviceForm');
  const logoutButton = document.getElementById('logoutBtn');

  form?.addEventListener('submit', event => {
    submitHandler(event).catch(error => console.error(error));
  });

  logoutButton?.addEventListener('click', () => {
    logout();
    window.location.reload();
    localStorage.clear();
  });
});

const submitHandler = async event => {
  event.preventDefault();

  const formData = new FormData(event.target);

  const clientId = formData.get('clientId');

  await init({
    clientId,
    credentialsStorageKey: 'limitedInputDevice',
    scopes: ['r_usr', 'w_usr'],
  });

  await limitedInputDeviceLogin();
};

const limitedInputDeviceLogin = async () => {
  const response = await initializeDeviceLogin();

  const deviceCode = document.getElementById('limitedDeviceCode');

  deviceCode.innerHTML = response.userCode;
  deviceCode.setAttribute(
    'href',
    `https://${response.verificationUriComplete}`,
  );

  await finalizeDeviceLogin();

  await getUserInfo();
  document.getElementById('limitedInputDeviceForm').style.display = 'none';
  deviceCode.style.display = 'none';
};
