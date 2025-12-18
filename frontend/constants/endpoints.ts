const endpoints = {
    auth: {
        login: '/auth/login',
        register: '/auth/register',
        refresh: '/auth/refresh',
        changePassword: '/auth/change-password',
        forgotPassword: '/auth/forgot-password',
        resetPassword: '/auth/reset-password',
        verifyEmailOTP: '/auth/verify-email-otp',
        resendVerificationOTP: '/auth/resend-verification-otp',
    },
    jobs: {
        getContractor: '/jobs/contractor',
        getHomeowner: '/jobs/homeowner',
        create: '/jobs',
        getById: (id: string) => `/jobs/${id}`,
        update: (id: string) => `/jobs/${id}`,
        close: (id: string) => `/jobs/${id}/close`,
        delete: (id: string) => `/jobs/${id}`,
    },
    contacts: {
        getByJob: (jobId: string) => `/contacts/job/${jobId}`,
        getHomeowner: '/contacts/homeowner',
        checkContact: (jobId: string) => `/contacts/check/${jobId}`,
        create: '/contacts',
    },
    chats: {
        getAll: '/chats',
        getById: (id: string) => `/chats/${id}`,
        getMessages: (chatId: string) => `/chats/${chatId}/messages`,
        sendMessage: (chatId: string) => `/chats/${chatId}/messages`,
        markAsRead: (chatId: string) => `/chats/${chatId}/read`,
        getUnreadCount: '/chats/unread-count',
    },
    profile: {
        getSettings: '/profile/settings',
        updateSettings: '/profile/settings',
    },
    upload: {
        chatFile: '/upload/chat-file',
    },
    payments: {
        process: '/payments/process',
        getStatus: (paymentIntentId: string) => `/payments/status/${paymentIntentId}`,
    },
}

export default endpoints;