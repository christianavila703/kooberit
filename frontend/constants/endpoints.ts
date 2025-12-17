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
    jobPosts: {
        create: '/job-posts',
        getHomeowner: '/job-posts/homeowner',
        getById: (id: string) => `/job-posts/${id}`,
        update: (id: string) => `/job-posts/${id}`,
        close: (id: string) => `/job-posts/${id}/close`,
        delete: (id: string) => `/job-posts/${id}`,
    },
    contacts: {
        getByJobPost: (jobPostId: string) => `/contacts/job-post/${jobPostId}`,
        getHomeowner: '/contacts/homeowner',
        checkContact: (jobPostId: string) => `/contacts/check/${jobPostId}`,
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
    contractor: {
        getJobBoard: '/contractor/job-board',
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