require 'rails_helper'

RSpec.describe 'User sign in', type: :system do
  it 'allows a user to sign in' do
    user = create(:user)

    visit new_user_session_path
    fill_in 'E-mail', with: user.email
    fill_in 'Senha', with: 'password123'
    click_button 'Entrar'

    expect(page).to have_content(I18n.t('teams.selection.title'))
  end
end
