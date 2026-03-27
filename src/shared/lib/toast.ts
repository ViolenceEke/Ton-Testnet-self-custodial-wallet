import Swal from 'sweetalert2';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

type ToastInput = {
  tone: ToastTone;
  title: string;
  text?: string;
  durationMs?: number;
};

let isLoadingToastOpen = false;

export const showToast = ({ tone, title, text, durationMs = 3600 }: ToastInput): void => {
  void Swal.fire({
    toast: true,
    icon: tone,
    title,
    text,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: durationMs,
    timerProgressBar: true,
    customClass: {
      popup: 'wallet-toast'
    }
  });
};

export const showLoadingToast = (title: string, text?: string): void => {
  if (isLoadingToastOpen) {
    return;
  }

  isLoadingToastOpen = true;

  void Swal.fire({
    toast: true,
    title,
    text,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: undefined,
    allowEscapeKey: false,
    allowOutsideClick: false,
    customClass: {
      popup: 'wallet-toast wallet-toast-loading'
    },
    didOpen: () => {
      Swal.showLoading();
    },
    willClose: () => {
      isLoadingToastOpen = false;
    }
  });
};

export const closeLoadingToast = (): void => {
  if (!isLoadingToastOpen) {
    return;
  }

  Swal.close();
  isLoadingToastOpen = false;
};
