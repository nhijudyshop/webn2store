document.addEventListener('DOMContentLoaded', () => {
    const addUserBtn = document.getElementById('addUserBtn');
    const modal = document.getElementById('userModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const userForm = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    const userIdInput = document.getElementById('userId');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const passwordHelp = document.getElementById('passwordHelp');
    const roleInput = document.getElementById('role');

    const openModalForCreate = () => {
        userForm.reset();
        userIdInput.value = '';
        modalTitle.textContent = 'Thêm người dùng mới';
        passwordInput.required = true;
        passwordHelp.style.display = 'none';
        usernameInput.disabled = false;
        modal.style.display = 'flex';
    };

    const openModalForEdit = (user) => {
        userForm.reset();
        userIdInput.value = user.id;
        usernameInput.value = user.username;
        roleInput.value = user.role;
        modalTitle.textContent = `Chỉnh sửa người dùng: ${user.username}`;
        passwordInput.required = false;
        passwordInput.placeholder = "Để trống nếu không đổi";
        passwordHelp.style.display = 'block';
        usernameInput.disabled = true;
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    const renderUsers = (users) => {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                <td class="action-buttons">
                    <button class="edit-btn" data-id="${user.id}" title="Chỉnh sửa"><i data-lucide="edit"></i></button>
                    <button class="delete-btn" data-id="${user.id}" title="Xóa"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    };

    const loadUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const result = await response.json();
            if (result.success) {
                renderUsers(result.data);
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            showNotification('Lỗi tải danh sách người dùng.', 'error');
        }
    };

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = userIdInput.value;
        const isEditing = !!id;

        const userData = {
            username: usernameInput.value,
            password: passwordInput.value,
            role: roleInput.value,
        };

        if (isEditing && !userData.password) {
            delete userData.password; // Don't send empty password on update
        }

        const url = isEditing ? `/api/users/${id}` : '/api/users';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            const result = await response.json();
            if (response.ok) {
                showNotification(isEditing ? 'Cập nhật thành công!' : 'Thêm người dùng thành công!', 'success');
                closeModal();
                loadUsers();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    document.getElementById('usersTableBody').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const id = parseInt(editBtn.dataset.id);
            const response = await fetch('/api/users');
            const result = await response.json();
            const user = result.data.find(u => u.id === id);
            if (user) openModalForEdit(user);
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
                try {
                    const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (response.ok) {
                        showNotification('Đã xóa người dùng.', 'success');
                        loadUsers();
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        }
    });

    addUserBtn.addEventListener('click', openModalForCreate);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    loadUsers();
});