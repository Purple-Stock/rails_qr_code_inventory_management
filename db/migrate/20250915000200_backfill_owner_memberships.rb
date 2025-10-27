class BackfillOwnerMemberships < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def up
    # For each team, ensure its owner has a membership with role :owner
    say_with_time "Backfilling team owner memberships" do
      Team.find_each do |team|
        TeamMembership.find_or_create_by!(team: team, user: team.user) do |tm|
          tm.role = :owner
        end
      end
    end
  end

  def down
    # No-op: keep memberships
  end
end
