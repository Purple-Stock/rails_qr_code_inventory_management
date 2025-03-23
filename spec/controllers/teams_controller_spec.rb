require 'rails_helper'

RSpec.describe TeamsController, type: :controller do
  let(:user) { create(:user) }
  let(:valid_attributes) { { name: 'My Team' } }
  let(:invalid_attributes) { { name: '' } }

  before do
    @request.env["devise.mapping"] = Devise.mappings[:user]
    sign_in user
  end

  describe 'GET #index' do
    it 'returns a success response' do
      create(:team, user: user)
      get :index
      expect(response).to be_successful
    end
  end

  describe 'GET #show' do
    it 'returns a success response' do
      team = create(:team, user: user)
      get :show, params: { id: team.id }
      expect(response).to be_successful
    end
  end

  describe 'GET #new' do
    it 'returns a success response' do
      get :new
      expect(response).to be_successful
    end
  end

  describe 'POST #create' do
    context 'with valid parameters' do
      it 'creates a new Team' do
        expect {
          post :create, params: { team: valid_attributes }
        }.to change(Team, :count).by(1)
      end

      it 'redirects to the team selection page' do
        post :create, params: { team: valid_attributes }
        expect(response).to redirect_to(team_selection_path)
      end
    end

    context 'with invalid parameters' do
      it 'does not create a new Team' do
        expect {
          post :create, params: { team: invalid_attributes }
        }.to change(Team, :count).by(0)
      end

      it "returns a unsuccessful response (i.e. to display the 'new' template)" do
        post :create, params: { team: invalid_attributes }
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'GET #selection' do
    it 'returns a success response' do
      get :selection
      expect(response).to be_successful
    end

    it 'lists all teams for the current user' do
      team1 = create(:team, user: user)
      team2 = create(:team, user: user)
      other_user_team = create(:team)

      get :selection
      expect(assigns(:teams)).to include(team1, team2)
      expect(assigns(:teams)).not_to include(other_user_team)
    end
  end

  describe 'DELETE #destroy' do
    it 'destroys the requested team' do
      team = create(:team, user: user)
      expect {
        delete :destroy, params: { id: team.id }
      }.to change(Team, :count).by(-1)
    end

    it 'redirects to the teams list' do
      team = create(:team, user: user)
      delete :destroy, params: { id: team.id }
      expect(response).to redirect_to(teams_url)
    end
  end
end 